-- v24 : cadre des schémas sur les cartes (ne supprime rien).
-- image_box = [haut, gauche, bas, droite] de 0 à 1000 sur la photo de la page (image_path) ; null pour une carte sans schéma.
alter table public.cards add column if not exists image_box jsonb;
