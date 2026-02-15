import { createClient } from "npm:@supabase/supabase-js@2.95.3";

type SendPushRequest = {
  messageId?: number;
};

type ExpoPushResponseItem = {
  status: "ok" | "error";
  details?: {
    error?: string;
  };
};

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function chunkArray<T>(list: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < list.length; index += chunkSize) {
    chunks.push(list.slice(index, index + chunkSize));
  }
  return chunks;
}

function resolveNotificationBody(content: string | null, hasImage: boolean) {
  const cleanText = content?.trim() ?? "";
  if (cleanText) {
    return cleanText.length > 120 ? `${cleanText.slice(0, 117)}...` : cleanText;
  }

  if (hasImage) {
    return "📷 Rasm yuborildi";
  }

  return "Yangi xabar";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase environment variables" });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header" });
  }

  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!bearerToken) {
    return jsonResponse(401, { error: "Invalid authorization header" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(bearerToken);

  if (authError || !user) {
    return jsonResponse(401, {
      error: "Unauthorized",
      details: authError?.message ?? null,
    });
  }

  let payload: SendPushRequest;
  try {
    payload = (await request.json()) as SendPushRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const messageId = Number(payload?.messageId);
  if (!Number.isFinite(messageId) || messageId <= 0) {
    return jsonResponse(400, { error: "messageId is required" });
  }

  const { data: message, error: messageError } = await adminClient
    .from("messages")
    .select("id, conversation_id, user_id, username, content, image_url")
    .eq("id", messageId)
    .single();

  if (messageError || !message) {
    return jsonResponse(404, { error: "Message not found" });
  }

  if (message.user_id !== user.id) {
    return jsonResponse(403, { error: "You can notify only your own message sends" });
  }

  if (!message.conversation_id) {
    return jsonResponse(200, { ok: true, sent: 0, reason: "conversation_id_missing" });
  }

  const { data: conversation, error: conversationError } = await adminClient
    .from("conversations")
    .select("user1_id, user2_id")
    .eq("id", message.conversation_id)
    .single();

  if (conversationError || !conversation) {
    return jsonResponse(404, { error: "Conversation not found" });
  }

  const recipientUserId =
    conversation.user1_id === user.id
      ? conversation.user2_id
      : conversation.user2_id === user.id
      ? conversation.user1_id
      : null;

  if (!recipientUserId) {
    return jsonResponse(403, { error: "Sender is not part of this conversation" });
  }

  const { data: tokenRows, error: tokenError } = await adminClient
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", recipientUserId);

  if (tokenError) {
    return jsonResponse(500, { error: `Token query failed: ${tokenError.message}` });
  }

  const rawTokens = (tokenRows ?? []).map((row) => row.expo_push_token);
  const uniqueTokens = [...new Set(rawTokens)].filter((token) => token.startsWith("ExponentPushToken["));

  if (uniqueTokens.length === 0) {
    return jsonResponse(200, { ok: true, sent: 0, reason: "recipient_no_tokens" });
  }

  const notificationBody = resolveNotificationBody(message.content, !!message.image_url);
  const notificationTitle =
    typeof message.username === "string" && message.username.trim()
      ? message.username.trim()
      : "Yangi xabar";

  const invalidTokens: string[] = [];
  let sentCount = 0;

  const tokenChunks = chunkArray(uniqueTokens, 100);
  for (const tokenChunk of tokenChunks) {
    const expoPayload = tokenChunk.map((token) => ({
      to: token,
      title: notificationTitle,
      body: notificationBody,
      sound: "default",
      priority: "high",
      channelId: "default",
      ttl: 60 * 60,
      data: {
        conversationId: message.conversation_id,
        messageId: message.id,
        senderId: message.user_id,
      },
    }));

    const expoResponse = await fetch(expoPushEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(expoPayload),
    });

    if (!expoResponse.ok) {
      const failedText = await expoResponse.text();
      return jsonResponse(502, {
        error: "Expo push send failed",
        details: failedText.slice(0, 300),
      });
    }

    const expoResult = (await expoResponse.json()) as { data?: ExpoPushResponseItem[] };
    const results = expoResult.data ?? [];

    results.forEach((result, resultIndex) => {
      if (result.status === "ok") {
        sentCount += 1;
        return;
      }

      const token = tokenChunk[resultIndex];
      const expoErrorCode = result.details?.error;
      if (
        token &&
        (expoErrorCode === "DeviceNotRegistered" || expoErrorCode === "InvalidCredentials")
      ) {
        invalidTokens.push(token);
      }
    });
  }

  if (invalidTokens.length > 0) {
    await adminClient
      .from("push_tokens")
      .delete()
      .in("expo_push_token", [...new Set(invalidTokens)]);
  }

  return jsonResponse(200, {
    ok: true,
    sent: sentCount,
    invalidTokensRemoved: [...new Set(invalidTokens)].length,
  });
});
