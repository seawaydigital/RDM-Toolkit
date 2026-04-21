export default function MainContent({ children }) {
  return (
    <main id="main-content" className="main-content" tabIndex={-1}>
      {children}
    </main>
  );
}
