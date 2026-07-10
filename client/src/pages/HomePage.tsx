interface HomePageProps {
  apiPrefix: string;
}

export function HomePage({ apiPrefix }: HomePageProps) {
  return (
    <section className="max-w-lg text-center space-y-4">
      <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">
        Restaurant Order System
      </h1>
      <p className="text-stone-600">
        Placeholder frontend scaffold. API base path: <code className="text-sm">{apiPrefix}</code>
      </p>
    </section>
  );
}
