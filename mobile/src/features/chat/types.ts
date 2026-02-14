export type ChatUser = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

export type Conversation = {
  id: string;
  created_at: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string | null;
  other_user?: ChatUser;
  last_message?: string;
  unread_count?: number;
};

export type Message = {
  id: number;
  created_at: string;
  user_id: string | null;
  username: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: number | null;
  conversation_id: string | null;
  read_at: string | null;
};
