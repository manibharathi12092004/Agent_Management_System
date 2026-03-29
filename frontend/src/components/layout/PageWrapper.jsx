import TopBar from './TopBar';

export default function PageWrapper({ children, title, subtitle, actions }) {
  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {title && <TopBar title={title} subtitle={subtitle} actions={actions} />}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
