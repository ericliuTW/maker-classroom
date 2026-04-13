-- Functions to safely increment/decrement item quantities
CREATE OR REPLACE FUNCTION increment_item_quantity(item_uuid UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE items SET quantity = quantity + amount WHERE id = item_uuid;
  -- Auto-update status
  UPDATE items SET status = CASE
    WHEN quantity <= 0 THEN 'out_of_stock'
    WHEN quantity <= min_quantity THEN 'low_stock'
    ELSE 'available'
  END WHERE id = item_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_item_quantity(item_uuid UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE items SET quantity = GREATEST(0, quantity - amount) WHERE id = item_uuid;
  -- Auto-update status
  UPDATE items SET status = CASE
    WHEN quantity <= 0 THEN 'out_of_stock'
    WHEN quantity <= min_quantity THEN 'low_stock'
    ELSE 'available'
  END WHERE id = item_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
