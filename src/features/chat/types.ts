export type Message = {
  id: number;
  created_at: string;
  user_id: string | null;
  username: string;
  content: string;
  conversation_id: string | null;
};

export type Conversation = {
  id: string;
  created_at: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string | null;
  other_user?: User;
  last_message?: string;
};

export type User = {
  id: string;
  email: string;
  display_name: string;
};

export type AuthMode = "signin" | "signup";
