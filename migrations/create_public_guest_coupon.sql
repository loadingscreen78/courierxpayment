-- Create a public 10% discount coupon for guest bookings
-- This coupon is available to all guest users (no authentication required)

INSERT INTO promo_coupons (
  code,
  description,
  discount_type,
  discount_value,
  min_recharge_amount,
  max_discount,
  max_uses,
  max_uses_per_user,
  valid_from,
  valid_until,
  is_active,
  bypass_min_recharge,
  guest_eligible,
  created_at,
  updated_at
) VALUES (
  'WELCOME10',
  'Public 10% discount for all guest bookings',
  'percentage',
  10,
  0,
  500,
  NULL,
  NULL,
  NOW(),
  NULL,
  true,
  false,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_recharge_amount = EXCLUDED.min_recharge_amount,
  max_discount = EXCLUDED.max_discount,
  is_active = EXCLUDED.is_active,
  guest_eligible = EXCLUDED.guest_eligible,
  updated_at = NOW();

-- Verify the coupon was created
SELECT 
  code,
  description,
  discount_type,
  discount_value,
  max_discount,
  is_active,
  guest_eligible
FROM promo_coupons
WHERE code = 'WELCOME10';
