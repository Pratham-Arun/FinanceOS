# Receipt Image Testing Notes

## Mock OCR File-Naming Guide

The backend's mock OCR engine matches expense category and vendor based on the **filename** of the uploaded image.
Name your test files according to the table below to trigger specific AI extraction results:

| Filename keyword | Extracted Vendor | Category       | Amount   | Confidence |
|-----------------|------------------|----------------|----------|------------|
| `uber`, `taxi`, `cab`, `travel` | Uber Inc.     | Travel         | $24.50   | High (98%) |
| `starbucks`, `meal`, `food`, `lunch`, `dinner` | Starbucks Cafe | Meals | $12.80 | High (95%) |
| `hotel`, `stay`, `accommodation`, `hilton` | Hilton Hotels | Accommodation | $320.00 | High (97%) |
| `supplies`, `office`, `paper` | Office Depot | Supplies | $85.00 | Medium (92%) |
| _any other name_ | General Merchant Inc. | Other | $45.00 | Medium (85%) |

## File Validation Rules (Client-side)

- **Allowed types**: JPG, JPEG, PNG, PDF
- **Max size**: 5 MB
- Files exceeding limits receive an error message **before** upload is attempted

## Suggested Test Images

Create dummy files with these names to test specific OCR flows:

```
taxi_receipt.png     → Travel / Uber / $24.50
starbucks_lunch.jpg  → Meals / Starbucks / $12.80
hotel_stay.pdf       → Accommodation / Hilton / $320.00
office_supplies.png  → Supplies / Office Depot / $85.00
receipt_unknown.jpg  → Other / General Merchant / $45.00
```

## Confidence Score Levels

| Score Range | Display Color | Meaning |
|------------|---------------|---------|
| ≥ 90%      | 🟢 Green      | High confidence – field auto-populated |
| 75–89%     | 🟡 Amber      | Medium confidence – review recommended |
| < 75%      | 🔴 Red        | Low confidence – manual correction needed |

## Test Cases

1. **Valid JPEG** (< 5MB, named `uber.png`): Should auto-fill form with Uber Travel data
2. **Valid PDF** (< 5MB, named `hotel.pdf`): Should extract Hilton accommodation data
3. **Invalid type** (`.exe` or `.zip`): Should show "Invalid file type" error immediately
4. **Oversized file** (> 5MB): Should show "File is too large" error immediately
5. **Drag-and-drop** any valid file: Should trigger upload same as click-to-browse
6. **Blurred/unknown** filename (e.g. `receipt.png`): Shows General Merchant / Other / $45.00 with ~85% confidence
