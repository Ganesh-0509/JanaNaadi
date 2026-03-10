import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Entity } from '../api/ontology';

interface GraphNode extends Entity {
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
  type: string;
  strength: number;
  sentiment?: string;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick?: (node: GraphNode) => void;
  width?: number;
  height?: number;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: '#3b82f6',        // blue
  organization: '#8b5cf6',  // purple
  location: '#10b981',      // green
  event: '#f59e0b',         // amber
  policy: '#ef4444',        // red
  technology: '#06b6d4',    // cyan
  infrastructure: '#6366f1',// indigo
  other: '#6b7280'          // gray
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  nodes,
  links,
  onNodeClick,
  width = 1200,
  height = 700
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear existing content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height] as any)
      .attr('style', 'max-width: 100%; height: auto;');

    // Create container for zoom
    const container = svg.append('g');

    // Define arrow markers for relationships
    const defs = svg.append('defs');
    
    Object.entries(ENTITY_TYPE_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => 100 / (d.strength || 0.5))
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        if (d.sentiment === 'positive') return '#10b981';
        if (d.sentiment === 'negative') return '#ef4444';
        return '#94a3b8';
      })
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt((d.strength || 0.5) * 3))
      .attr('marker-end', d => {
        const sourceNode = nodes.find(n => n.id === (typeof d.source === 'number' ? d.source : d.source.id));
        const color = sourceNode ? ENTITY_TYPE_COLORS[sourceNode.entity_type] : ENTITY_TYPE_COLORS.other;
        return `url(#arrow-${sourceNode?.entity_type || 'other'})`;
      });

    // Create link labels
    const linkLabel = container.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .text(d => d.type.replace('_', ' '));

    // Create nodes
    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(drag(simulation) as any);

    // Node circles
    node.append('circle')
      .attr('r', d => 5 + Math.sqrt(d.mention_count || 1) * 2)
      .attr('fill', d => ENTITY_TYPE_COLORS[d.entity_type] || ENTITY_TYPE_COLORS.other)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .attr('x', 0)
      .attr('y', d => -(5 + Math.sqrt(d.mention_count || 1) * 2 + 5))
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .attr('fill', '#1e293b')
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name);

    // Node interactions
    node
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (event, d) => onNodeClick?.(d));

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      linkLabel
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, onNodeClick]);

  // Drag behavior
  function drag(simulation: d3.Simulation<GraphNode, undefined>) {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full border border-slate-200 rounded-lg bg-white" />
      
      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border border-slate-200 max-w-xs z-10">
          <h4 className="font-bold text-lg text-slate-900">{hoveredNode.name}</h4>
          <p className="text-sm text-slate-600 capitalize">{hoveredNode.entity_type}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p><strong>Mentions:</strong> {hoveredNode.mention_count}</p>
            {hoveredNode.sentiment_score !== undefined && (
              <p>
                <strong>Sentiment:</strong>{' '}
                <span className={
                  hoveredNode.sentiment_score > 0 ? 'text-green-600' :
                  hoveredNode.sentiment_score < 0 ? 'text-red-600' : 'text-slate-600'
                }>
                  {hoveredNode.sentiment_score.toFixed(2)}
                </span>
              </p>
            )}
            {hoveredNode.description && (
              <p className="text-xs text-slate-500 mt-2">{hoveredNode.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-slate-200">
        <h4 className="font-bold text-sm mb-2">Entity Types</h4>
        <div className="space-y-1">
          {Object.entries(ENTITY_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
