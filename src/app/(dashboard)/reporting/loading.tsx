function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/60 ${className}`} />;
}

export default function ReportingLoading() {
  return (
    <div className="mx-auto max-w-[1440px]" aria-busy="true" aria-label="Φόρτωση αναφορών">
      <Block className="mb-2 h-7 w-40" />
      <Block className="mb-6 h-4 w-72" />
      <Block className="mb-6 h-9 w-full max-w-3xl" />
      <Block className="h-[118px] w-full" />
      <Block className="mt-8 mb-5 h-6 w-64" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Block className="h-[330px] lg:col-span-2" />
        <Block className="h-[330px]" />
      </div>
    </div>
  );
}
