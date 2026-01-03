-- Migration: 001_create_users_and_auth.sql
-- Description: Core user management and authentication tables

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL,
  status user_status DEFAULT 'PENDING',
  profile JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  address JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- KYC documents table
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_url TEXT NOT NULL,
  status kyc_status DEFAULT 'PENDING',
  verification_data JSONB DEFAULT '{}',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- Add triggers
CREATE TRIGGER users_audit_trigger BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER user_profiles_audit_trigger BEFORE INSERT OR UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER kyc_documents_audit_trigger BEFORE INSERT OR UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Add event triggers
CREATE TRIGGER users_event_trigger AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION publish_event();
CREATE TRIGGER kyc_documents_event_trigger AFTER INSERT OR UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION publish_event();

-- Row Level Security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

-- Profiles policies
CREATE POLICY profiles_select_own ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_insert_own ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update_own ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Admin access to all data
CREATE POLICY admin_all_access ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY admin_profiles_access ON user_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY admin_kyc_access ON kyc_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);