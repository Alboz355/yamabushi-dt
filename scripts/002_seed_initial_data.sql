-- Seed initial data for Yamabushi Martial Arts Academy

-- Insert martial arts disciplines
INSERT INTO public.disciplines (name, description, color_code) VALUES
('Brazilian Jiu-Jitsu', 'Ground fighting and grappling martial art focusing on submission holds', '#be123c'),
('Grappling', 'Wrestling-based martial art emphasizing takedowns and ground control', '#ec4899'),
('Boxing', 'Stand-up combat sport using punches and footwork', '#7c3aed'),
('Kickboxing', 'Hybrid martial art combining boxing with kicks', '#0891b2');

-- Insert sample instructor data (will be linked to actual user profiles later)
-- Note: These will need to be updated with real profile_ids after user registration
