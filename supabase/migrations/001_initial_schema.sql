-- Maker Classroom Management System - Initial Schema

-- Categories for items
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'package',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items (materials & equipment)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  barcode TEXT,
  qr_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '個',
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','low_stock','out_of_stock','discontinued')),
  min_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_qr_code ON items(qr_code);
CREATE INDEX idx_items_category ON items(category_id);

-- Item locations on classroom map
CREATE TABLE item_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  pos_x FLOAT NOT NULL DEFAULT 0,
  pos_y FLOAT NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  label TEXT
);

-- Classroom configuration
CREATE TABLE classroom_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Maker教室',
  width INTEGER NOT NULL DEFAULT 1200,
  height INTEGER NOT NULL DEFAULT 800,
  background_image TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default classroom
INSERT INTO classroom_config (name) VALUES ('Maker教室');

-- Access codes for students
CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_access_codes_code ON access_codes(code);

-- Transactions (borrow/return/purchase/repair/dispose)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('borrow','return','purchase','repair','dispose')),
  quantity INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  scanned_code TEXT,
  session_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transactions_item ON transactions(item_id);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Projects (AI-designed)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_response TEXT,
  materials_json JSONB,
  equipment_json JSONB,
  todo_json JSONB,
  session_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge base
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  required_materials TEXT[] DEFAULT '{}',
  required_equipment TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  equipment_items TEXT[] DEFAULT '{}',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  session_token TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: everyone can read most tables
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Auth users manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read items" ON items FOR SELECT USING (true);
CREATE POLICY "Auth users manage items" ON items FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read item_locations" ON item_locations FOR SELECT USING (true);
CREATE POLICY "Auth users manage item_locations" ON item_locations FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read classroom_config" ON classroom_config FOR SELECT USING (true);
CREATE POLICY "Auth users manage classroom_config" ON classroom_config FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users manage access_codes" ON access_codes FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth users update transactions" ON transactions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own projects" ON projects FOR UPDATE USING (true);

CREATE POLICY "Anyone can read knowledge_base" ON knowledge_base FOR SELECT USING (true);
CREATE POLICY "Auth users manage knowledge_base" ON knowledge_base FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bookings" ON bookings FOR UPDATE USING (true);
CREATE POLICY "Auth users delete bookings" ON bookings FOR DELETE USING (auth.role() = 'authenticated');

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert some default categories
INSERT INTO categories (name, icon, description) VALUES
  ('電子零件', 'cpu', 'Arduino、感測器、LED、電阻等'),
  ('工具', 'wrench', '螺絲起子、鉗子、烙鐵等'),
  ('材料', 'box', '木板、壓克力、3D列印線材等'),
  ('設備', 'monitor', '3D印表機、雷切機、示波器等'),
  ('耗材', 'package', '膠帶、螺絲、熱縮管等');
