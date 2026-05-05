
-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Otimização de busca textual

-- 2. Limpeza de Políticas Antigas (Reset RLS para evitar conflitos)
DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "' || r.tablename || '"';
    END LOOP;
END $$;

-- 3. Tabelas Principais

-- PERFIS DE USUÁRIO
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY, -- Gerado via auth ou frontend
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    user_type TEXT DEFAULT 'STANDARD', -- 'STANDARD' ou 'CREATOR'
    phone TEXT,
    document_id TEXT,
    birth_date BIGINT,
    profile_picture TEXT,
    balance FLOAT DEFAULT 0,
    credentials TEXT,
    bio TEXT,
    verification_file_url TEXT, -- Arquivo para validação profissional
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expiry BIGINT,
    followers TEXT[] DEFAULT '{}',
    followed_users TEXT[] DEFAULT '{}',
    store_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POSTAGENS (Feed, Reels, Lives)
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'TEXT', -- 'TEXT', 'IMAGE', 'LIVE', 'REEL'
    content TEXT,
    image_url TEXT,
    timestamp BIGINT, 
    likes TEXT[] DEFAULT '{}',
    comments JSONB DEFAULT '[]', -- Array de objetos de comentário
    shares TEXT[] DEFAULT '{}',
    saves TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_boosted BOOLEAN DEFAULT FALSE,
    boost_expires BIGINT,
    live_data JSONB, -- { title, description, isPaid, price }
    reel_data JSONB, -- { videoUrl, description, audioTrackId, aiEffectPrompt, filter }
    font_family TEXT,
    text_color TEXT,
    background_color TEXT,
    font_size TEXT,
    group_id UUID, -- Link opcional para grupo (Comunidades)
    group_name TEXT,
    indicated_user_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migração de segurança para adicionar coluna comments se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'comments') THEN
        ALTER TABLE posts ADD COLUMN comments JSONB DEFAULT '[]';
    END IF;
END $$;

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT, 
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    sale_id UUID,
    group_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOJAS
CREATE TABLE IF NOT EXISTS stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    brand_color TEXT DEFAULT '#2563eb',
    product_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price FLOAT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    affiliate_commission_rate FLOAT DEFAULT 0, 
    type TEXT DEFAULT 'DIGITAL_COURSE', 
    ratings JSONB DEFAULT '[]',
    average_rating FLOAT DEFAULT 5.0,
    rating_count INT DEFAULT 0,
    digital_content_url TEXT,
    digital_download_instructions TEXT,
    colors TEXT[] DEFAULT '{}',
    is_dropshipping BOOLEAN DEFAULT FALSE,
    external_provider_id TEXT,
    original_price FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VENDAS DE AFILIADOS / PEDIDOS
CREATE TABLE IF NOT EXISTS affiliate_sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    affiliate_user_id TEXT, -- Pode ser vazio se venda direta
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    commission_earned FLOAT DEFAULT 0,
    sale_amount FLOAT NOT NULL,
    timestamp BIGINT,
    status TEXT DEFAULT 'WAITLIST', -- WAITLIST, PROCESSING_SUPPLIER, SHIPPING, DELIVERED
    is_rated BOOLEAN DEFAULT FALSE,
    shipping_address JSONB,
    digital_content_url TEXT,
    digital_download_instructions TEXT,
    is_dropshipping BOOLEAN DEFAULT FALSE,
    supplier_cost FLOAT,
    supplier_order_id TEXT,
    tracking_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STORIES
CREATE TABLE IF NOT EXISTS stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_profile_pic TEXT,
    items JSONB DEFAULT '[]', -- Array de StoryItem
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_story UNIQUE (user_id) -- Um registro de story por usuário (contém array de itens)
);

-- CHATS E GRUPOS
CREATE TABLE IF NOT EXISTS chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT DEFAULT 'PRIVATE', -- PRIVATE, GROUP
    participants TEXT[] DEFAULT '{}', -- IDs dos usuários
    messages JSONB DEFAULT '[]', -- Array de Message
    group_name TEXT,
    group_image TEXT,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,
    description TEXT,
    theme TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANÚNCIOS (ADS)
CREATE TABLE IF NOT EXISTS ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    target_audience TEXT,
    budget FLOAT,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    link_url TEXT,
    cta_text TEXT,
    timestamp BIGINT,
    min_age INT,
    max_age INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTOS
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    creator_name TEXT,
    title TEXT,
    description TEXT,
    date_time BIGINT,
    end_date_time BIGINT,
    type TEXT DEFAULT 'ONLINE',
    attendees TEXT[] DEFAULT '{}',
    image_url TEXT,
    location TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATÓRIOS E DENÚNCIAS
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_id TEXT,
    target_type TEXT, -- POST, COMMENT, USER
    reason TEXT,
    details TEXT,
    status TEXT DEFAULT 'OPEN', -- OPEN, RESOLVED, DISMISSED
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT, -- DEPOSIT, WITHDRAWAL, etc
    amount FLOAT,
    description TEXT,
    timestamp BIGINT,
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOGS DO SISTEMA (ADMIN)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID,
    action TEXT,
    target_id TEXT,
    details TEXT,
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAIXAS DE ÁUDIO (Música para Reels)
CREATE TABLE IF NOT EXISTS audio_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT,
    artist TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINKS DE AFILIADOS GERADOS
CREATE TABLE IF NOT EXISTS affiliate_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    link TEXT,
    timestamp BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONFIGURAÇÕES GLOBAIS DO SISTEMA
CREATE TABLE IF NOT EXISTS system_config (
    id INT PRIMARY KEY DEFAULT 1,
    platform_tax FLOAT DEFAULT 0.1,
    upgrade_cost FLOAT DEFAULT 29.9,
    min_withdrawal FLOAT DEFAULT 50.0,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inicializar Configuração Padrão
INSERT INTO system_config (id, platform_tax) VALUES (1, 0.1) ON CONFLICT DO NOTHING;

-- 4. RLS - Políticas de Segurança (Modo Aberto para Protótipo)
-- Em produção, substitua "USING (true)" por verificações de auth.uid()

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Profiles Access" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Posts Access" ON posts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Notifications Access" ON notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Stores Access" ON stores FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Products Access" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Sales Access" ON affiliate_sales FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Stories Access" ON stories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Chats Access" ON chats FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Ads Access" ON ads FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Events Access" ON events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Reports Access" ON reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Transactions Access" ON transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Logs Access" ON system_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Audio Access" ON audio_tracks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Links Access" ON affiliate_links FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Config Access" ON system_config FOR ALL USING (true) WITH CHECK (true);

-- 5. Funções e Triggers

-- Função para processar curtidas e notificações
CREATE OR REPLACE FUNCTION toggle_like(post_uuid UUID, user_uuid TEXT)
RETURNS VOID AS $$
DECLARE
    curr_likes TEXT[];
    author_id UUID;
BEGIN
    SELECT COALESCE(likes, '{}'), user_id INTO curr_likes, author_id FROM posts WHERE id = post_uuid;
    
    IF curr_likes @> ARRAY[user_uuid] THEN
        -- Remover like
        UPDATE posts SET likes = array_remove(likes, user_uuid) WHERE id = post_uuid;
    ELSE
        -- Adicionar like
        UPDATE posts SET likes = array_append(curr_likes, user_uuid) WHERE id = post_uuid;
        
        -- Criar notificação se não for o próprio autor
        IF author_id::text != user_uuid THEN
            INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, timestamp, is_read)
            VALUES (uuid_generate_v4(), author_id, user_uuid::uuid, 'LIKE', post_uuid, extract(epoch from now()) * 1000, FALSE);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir dados iniciais de exemplo (Áudio)
INSERT INTO audio_tracks (id, title, artist, url) VALUES 
(uuid_generate_v4(), 'Cyber Dreams', 'Synthwave Boy', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
(uuid_generate_v4(), 'Neon City', 'Retro Future', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3')
ON CONFLICT DO NOTHING;

-- 6. Storage (Criação de Bucket para Uploads)
INSERT INTO storage.buckets (id, name, public) VALUES ('cyberphone', 'cyberphone', true) ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage (Modo Aberto)
CREATE POLICY "Public Storage Select" ON storage.objects FOR SELECT USING ( bucket_id = 'cyberphone' );
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'cyberphone' );
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'cyberphone' );
