import Nav from "@/components/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-formwise-app tells the extension not to offer filling on Formwise's own pages.
    <div data-formwise-app="">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
