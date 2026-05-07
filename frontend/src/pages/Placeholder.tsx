export default function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
      <div className="bg-muted p-6 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
      </div>
      <h2 className="text-2xl font-bold">Module Under Construction</h2>
      <p className="text-muted-foreground max-w-md">This module is currently being implemented. It will be available in the next release phase.</p>
    </div>
  );
}
