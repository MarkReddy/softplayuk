// Shared markdown-to-HTML renderer for blog/guide content
export function renderMarkdown(content: string): string {
  return content
    .replace(/^#### (.+)$/gm, '<h4 class="mt-6 mb-2 font-serif text-base font-bold text-foreground">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="mt-8 mb-3 font-serif text-lg font-bold text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-10 mb-4 font-serif text-2xl font-bold text-foreground">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-muted-foreground leading-relaxed">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-muted-foreground leading-relaxed">$2</li>')
    .replace(/(<li class="ml-4 list-disc[^>]*>.*<\/li>\n?)+/g, '<ul class="my-4 space-y-1.5">$&</ul>')
    .replace(/(<li class="ml-4 list-decimal[^>]*>.*<\/li>\n?)+/g, '<ol class="my-4 space-y-1.5">$&</ol>')
    .replace(/^(?!<[hulo])(.*\S.*)$/gm, '<p class="mb-4 leading-relaxed text-muted-foreground">$1</p>')
}
