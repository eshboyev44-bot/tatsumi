export type Message = {
  id: number;
  created_at: string;
  user_id: string | null;
  username: string;
  content: string;
};

export type AuthMode = "signin" | "signup";
