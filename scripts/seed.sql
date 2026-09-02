-- ============================================================
-- Script para popular o banco Traço & Volume no PlanetScale
-- Execute no Console do PlanetScale (app.planetscale.com)
-- ============================================================

-- Admin user (senha: tracovolume2026)
INSERT INTO admin_users (username, password_hash) VALUES ('admin', '$2a$12$c2iVlZAM4bhTvWU/IBPkDeCFeLdB5fJagEg/pSw7uWrzEciWnaabi');

-- Produtos de exemplo
INSERT INTO products (name, slug, short_description, description, price, compare_price, images, category, material, weight, dimensions, stock, featured, active) VALUES
('Vaso Decorativo Geométrico', 'vaso-decorativo-geometrico', 'Vaso moderno com design geométrico.', 'Vaso decorativo PLA de alta qualidade.\n\n• Material: PLA Premium\n• Dimensões: 15x15x20 cm\n• Peso: 150g', 59.90, 79.90, '[]', 'decoração', 'PLA Premium', 150, '15x15x20 cm', 10, 1, 1),
('Porta-Canetas Personalizado', 'porta-canetas-personalizado', 'Organizador de mesa exclusivo.', 'Porta-canetas impresso em 3D.\n\n• Material: PLA\n• Dimensões: 10x8x12 cm\n• Peso: 80g', 34.90, NULL, '[]', 'escritório', 'PLA', 80, '10x8x12 cm', 20, 1, 1),
('Suporte para Celular', 'suporte-para-celular', 'Suporte ajustável minimalista.', 'Suporte universal para celular.\n\n• Material: PLA+\n• Dimensões: 8x6x10 cm\n• Peso: 45g', 24.90, 34.90, '[]', 'acessórios', 'PLA+', 45, '8x6x10 cm', 30, 1, 1),
('Miniatura de Animal - Golfinho', 'miniatura-golfinho', 'Miniatura realista detalhada.', 'Miniatura de golfinho em resina.\n\n• Material: Resina\n• Dimensões: 12x5x8 cm\n• Peso: 60g', 44.90, NULL, '[]', 'coleção', 'Resina', 60, '12x5x8 cm', 15, 0, 1),
('Luminária LED Personalizada', 'luminaria-led-personalizada', 'Luminária com efeito noturno.', 'Luminária decorativa com LED.\n\n• Material: PLA Translúcido\n• Dimensões: 12x12x18 cm\n• Peso: 200g', 89.90, 129.90, '[]', 'decoração', 'PLA Translúcido', 200, '12x12x18 cm', 8, 1, 1),
('Chaveiro Personalizado', 'chaveiro-personalizado', 'Chaveiro com seu nome ou logo.', 'Chaveiro personalizado impresso em 3D.\n\n• Material: PLA\n• Dimensões: 5x2.5x0.5 cm\n• Peso: 10g', 14.90, NULL, '[]', 'acessórios', 'PLA', 10, '5x2.5x0.5 cm', 50, 0, 1),
('Busto para Decoração', 'busto-decoracao', 'Busto clássico para interiores.', 'Busto decorativo com detalhes precisos.\n\n• Material: PLA Premium\n• Dimensões: 8x6x15 cm\n• Peso: 120g', 54.90, 69.90, '[]', 'decoração', 'PLA Premium', 120, '8x6x15 cm', 12, 0, 1),
('Organizador de Gavetas', 'organizador-de-gavetas', 'Módulo organizador divisível.', 'Organizador modular para gavetas.\n\n• Material: PLA\n• Dimensões: 20x10x5 cm\n• Peso: 90g', 29.90, NULL, '[]', 'escritório', 'PLA', 90, '20x10x5 cm', 25, 0, 1);