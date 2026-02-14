import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ChatListScreenProps = {
  contactName: string;
  lastMessage: string;
  lastTime: string;
  onOpenChat: () => void;
  onSignOut: () => void;
};

const mockChats = [
  { name: "Andrew Parker", message: "What kind of strategy is better?", date: "11/16/19" },
  { name: "Karen Castillo", message: "Voice message · 0:14", date: "11/15/19" },
  { name: "Maximillian Jacobson", message: "Bro, I have a good idea!", date: "10/30/19" },
  { name: "Tabitha Potter", message: "Actually I wanted to check with you...", date: "8/25/19" },
];

export function ChatListScreen({
  contactName,
  lastMessage,
  lastTime,
  onOpenChat,
  onSignOut,
}: ChatListScreenProps) {
  return (
    <section className="flex flex-1 flex-col bg-white">
      <div className="border-b border-black/10 px-4 py-2">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="h-8 rounded-md px-1 text-[17px] text-[#007aff] hover:bg-[#eef3fa]"
          >
            Done
          </Button>
          <p className="text-[32px] font-bold text-[#111]">Chats</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenChat}
            className="size-8 rounded-md text-[#007aff] hover:bg-[#eef3fa]"
            aria-label="New chat"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-[15px] text-[#007aff]">
        <span>Broadcast Lists</span>
        <span>New Group</span>
      </div>

      <ScrollArea className="flex-1">
        <button
          type="button"
          onClick={onOpenChat}
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f8fbff]"
        >
          <Avatar className="size-12 bg-[#e2d6cb]">
            <AvatarFallback>{contactName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold text-[#111]">{contactName}</p>
            <p className="truncate text-[15px] text-[#6f7882]">{lastMessage}</p>
          </div>
          <span className="text-sm text-[#8d97a3]">{lastTime}</span>
        </button>
        <Separator />

        {mockChats.map((chat) => (
          <div key={chat.name}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar className="size-12 bg-[#dde2e7]">
                <AvatarFallback>{chat.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold text-[#111]">{chat.name}</p>
                <p className="truncate text-[15px] text-[#6f7882]">{chat.message}</p>
              </div>
              <span className="text-sm text-[#8d97a3]">{chat.date}</span>
            </div>
            <Separator />
          </div>
        ))}
      </ScrollArea>

      <div className="grid grid-cols-5 border-t border-black/10 bg-[#f7f7f7] py-2 text-center text-[11px] text-[#a1a8b0]">
        <span>Status</span>
        <span>Calls</span>
        <span>Camera</span>
        <span className="font-semibold text-[#007aff]">Chats</span>
        <span>Settings</span>
      </div>
    </section>
  );
}
