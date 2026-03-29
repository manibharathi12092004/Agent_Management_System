/**
 * Simple markdown to HTML parser
 * Converts common markdown syntax to HTML for better readability
 */

export function parseMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Convert headers (### Header -> <h3>Header</h3>)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mt-5 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>');

  // Convert bold text (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>');

  // Convert italic text (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
  html = html.replace(/_(.*?)_/g, '<em class="italic text-gray-800">$1</em>');

  // Convert unordered lists (* item or - item)
  html = html.replace(/^\*   (.*$)/gim, '<li class="ml-6 text-gray-700 leading-relaxed">$1</li>');
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-6 text-gray-700 leading-relaxed">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-6 text-gray-700 leading-relaxed">$1</li>');

  // Convert ordered lists (1. item)
  html = html.replace(/^\d+\.\s+(.*$)/gim, '<li class="ml-6 text-gray-700 leading-relaxed list-decimal">$1</li>');

  // Wrap consecutive list items in <ul> or <ol>
  html = html.replace(/(<li class="ml-6[^>]*>.*<\/li>\n?)+/g, (match) => {
    if (match.includes('list-decimal')) {
      return `<ol class="space-y-1 my-2">${match}</ol>`;
    }
    return `<ul class="space-y-1 my-2 list-disc">${match}</ul>`;
  });

  // Convert inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">$1</code>');

  // Convert links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Convert line breaks
  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  // Convert horizontal rules (--- or ***)
  html = html.replace(/^---$/gim, '<hr class="my-4 border-gray-200"/>');
  html = html.replace(/^\*\*\*$/gim, '<hr class="my-4 border-gray-200"/>');

  return html;
}

/**
 * Strip markdown formatting and return plain text
 */
export function stripMarkdown(text) {
  if (!text) return '';

  let plain = text;

  // Remove headers
  plain = plain.replace(/^#{1,6}\s+/gim, '');

  // Remove bold/italic
  plain = plain.replace(/\*\*(.*?)\*\*/g, '$1');
  plain = plain.replace(/__(.*?)__/g, '$1');
  plain = plain.replace(/\*(.*?)\*/g, '$1');
  plain = plain.replace(/_(.*?)_/g, '$1');

  // Remove list markers
  plain = plain.replace(/^\*\s+/gim, '');
  plain = plain.replace(/^-\s+/gim, '');
  plain = plain.replace(/^\d+\.\s+/gim, '');

  // Remove inline code
  plain = plain.replace(/`([^`]+)`/g, '$1');

  // Remove links but keep text
  plain = plain.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  return plain;
}
