import ChatPanel from '../components/ChatPanel';

export default function Chat() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>
      <ChatPanel />
    </div>
  );
}
