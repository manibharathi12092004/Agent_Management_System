export default function PageWrapper({ children, title, subtitle, actions }) {
  return (
    <div className="h-full flex flex-col bg-white">
      {title && (
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
