'use client';

import * as React from 'react';
import { ChevronRight, ChevronDown, FileText, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LawNode } from '@/lib/parser';

interface LawTreeProps {
  nodes: LawNode[];
  onSelect: (node: LawNode) => void;
  selectedId?: string;
}

export function LawTree({ nodes, onSelect, selectedId }: LawTreeProps) {
  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-1 p-2">
        {nodes.map((node, index) => (
          <TreeNode key={`${node.type}-${index}`} node={node} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </div>
    </ScrollArea>
  );
}

function TreeNode({ node, onSelect, selectedId }: { node: LawNode; onSelect: (node: LawNode) => void; selectedId?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isLeaf = node.children.length === 0;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLeaf) {
      onSelect(node);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const isSelected = isLeaf && node.title === selectedId;

  return (
    <div className="pl-4">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start h-auto py-1 px-2 font-normal hover:bg-muted/50 whitespace-normal text-left",
          isSelected && "bg-muted font-medium text-primary"
        )}
        onClick={handleSelect}
      >
        <div className="flex items-center">
          {!isLeaf ? (
             isOpen ? <ChevronDown className="h-4 w-4 mr-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mr-1 shrink-0" />
          ) : (
             <FileText className="h-4 w-4 mr-1 shrink-0 text-muted-foreground" />
          )}
          {!isLeaf && <Folder className="h-4 w-4 mr-1 shrink-0 text-blue-500" />}
          <span className="truncate">{node.title}</span>
        </div>
      </Button>
      
      {!isLeaf && isOpen && (
        <div className="border-l border-border ml-2">
          {node.children.map((child, i) => (
            <TreeNode key={`${child.type}-${i}`} node={child} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

