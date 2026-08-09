CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  persona_description TEXT NOT NULL,
  topic_focus TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rationale TEXT NOT NULL,
  source_url TEXT,
  topic_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
