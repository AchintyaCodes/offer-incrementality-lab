export default function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Achintya Gupta</p>
          <p className="text-xs text-zinc-400 mt-0.5">Data Science &amp; Engineering · B.Tech, MIT Manipal</p>
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-400">
          <a href="https://github.com/AchintyaCodes" target="_blank" rel="noopener noreferrer"
            className="hover:text-zinc-700 transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/in/achintya-gupta-bb0091311/" target="_blank" rel="noopener noreferrer"
            className="hover:text-zinc-700 transition-colors">LinkedIn</a>
          <span className="text-zinc-300">·</span>
          <span>Portfolio project · <a href="http://www.minethatdata.com/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700 transition-colors">Hillstrom dataset</a></span>
        </div>
      </div>
    </footer>
  );
}
