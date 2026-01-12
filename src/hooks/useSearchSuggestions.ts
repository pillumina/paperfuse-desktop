import { useMemo } from 'react';
import { useAllPapers } from './usePapers';
import { useTagsWithCounts } from './usePapers';

export interface SuggestionItem {
  id: string;
  type: 'tag' | 'topic' | 'recent' | 'popular';
  text: string;
  count?: number;
}

export function useSearchSuggestions(query: string, maxResults: number = 5) {
  const { data: papers } = useAllPapers();
  const { data: tagsWithCounts } = useTagsWithCounts(50);

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) {
      return [];
    }

    const results: SuggestionItem[] = [];
    const queryLower = query.toLowerCase();

    // 1. Match tags
    tagsWithCounts?.forEach(tag => {
      if (tag.tag.toLowerCase().includes(queryLower)) {
        results.push({
          id: `tag-${tag.tag}`,
          type: 'tag',
          text: tag.tag,
          count: tag.count,
        });
      }
    });

    // 2. Extract and match unique topics from papers
    const topicCounts = new Map<string, number>();
    papers?.forEach(paper => {
      paper.topics?.forEach(topic => {
        const currentCount = topicCounts.get(topic) || 0;
        topicCounts.set(topic, currentCount + 1);
      });
    });

    topicCounts.forEach((count, topic) => {
      if (topic.toLowerCase().includes(queryLower)) {
        results.push({
          id: `topic-${topic}`,
          type: 'topic',
          text: topic,
          count,
        });
      }
    });

    // 3. Match paper titles
    const seenTitles = new Set<string>();
    papers?.forEach(paper => {
      if (paper.title.toLowerCase().includes(queryLower)) {
        // Use first 50 chars as unique identifier
        const titleKey = paper.title.slice(0, 50);
        if (!seenTitles.has(titleKey) && results.length < maxResults * 2) {
          seenTitles.add(titleKey);
          results.push({
            id: `paper-${paper.id}`,
            type: 'recent',
            text: paper.title,
          });
        }
      }
    });

    // Sort: prioritize tags and topics, then papers
    results.sort((a, b) => {
      const typePriority = { tag: 0, topic: 1, recent: 2, popular: 3 };
      const aPriority = typePriority[a.type] ?? 99;
      const bPriority = typePriority[b.type] ?? 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Within same type, sort by exact match first, then prefix match
      const aExact = a.text.toLowerCase() === queryLower;
      const bExact = b.text.toLowerCase() === queryLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aPrefix = a.text.toLowerCase().startsWith(queryLower);
      const bPrefix = b.text.toLowerCase().startsWith(queryLower);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;

      // Then by count (descending)
      if (a.count !== undefined && b.count !== undefined) {
        return b.count - a.count;
      }

      // Finally alphabetically
      return a.text.localeCompare(b.text);
    });

    return results.slice(0, maxResults);
  }, [query, papers, tagsWithCounts, maxResults]);

  return suggestions;
}
