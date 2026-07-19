export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <p className="text-sm font-medium tracking-wide text-primary">SETTINGS</p>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
        Keep the experience useful.
      </h1>
      <p className="max-w-xl text-lg leading-7 text-muted-foreground">
        Preference persistence will be connected after the notification contract
        is available.
      </p>
    </main>
  );
}
