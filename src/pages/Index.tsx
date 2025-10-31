import { DictionaryDemo } from "../components/DictionaryDemo";
import TerminalWindow from "../components/TerminalWindow";

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-12">
      <TerminalWindow title="Dictionary Terminal v1.0" subtitle={"Welcome to Dictionary Terminal!"}>
        <div className="text-neutral-400 text-base mb-4 max-w-2xl">
          A Chrome extension that provides instant word definitions when you select text on any webpage.
          Try the demo below to see how it works!
        </div>

        <DictionaryDemo />
      </TerminalWindow>
    </div>
  );
};

export default Index;
