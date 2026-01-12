import type { Paper } from '../../lib/types';
import { PaperCard } from './PaperCard';
import { useNavigate } from 'react-router-dom';

interface PaperGridProps {
  papers: Paper[];
  onDelete?: (id: string) => void;
}

export function PaperGrid({ papers, onDelete }: PaperGridProps) {
  const navigate = useNavigate();

  if (papers.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {papers.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          onClick={() => navigate(`/papers/${paper.id}`)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
