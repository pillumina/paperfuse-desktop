import type { Paper } from '../../lib/types';
import { PaperListItem } from './PaperListItem';

interface PaperListProps {
  papers: Paper[];
  onDelete?: (id: string) => void;
}

export function PaperList({ papers, onDelete }: PaperListProps) {
  if (papers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {papers.map((paper) => (
        <PaperListItem key={paper.id} paper={paper} onDelete={onDelete} />
      ))}
    </div>
  );
}
