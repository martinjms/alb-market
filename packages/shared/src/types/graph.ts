export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, unknown>;
}

export interface GraphQuery {
  cypher: string;
  parameters?: Record<string, unknown>;
}

export interface GraphQueryResult {
  records: Array<{
    keys: string[];
    values: unknown[];
  }>;
  summary: {
    executionTime: number;
    resultAvailableAfter: number;
    resultConsumedAfter: number;
  };
}