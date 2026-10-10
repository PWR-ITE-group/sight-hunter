# Calibration 2026-10-10 23:46 · model `facebook/dinov2-base`

Places: 8, test photos: {'_none': 27, 'elzbieta': 5, 'hala': 6, 'katedra': 7, 'most': 7, 'opera': 6, 'piasek': 5, 'ratusz': 7, 'uniwersytet': 4}

## Recommended thresholds (worker .env)

```
VERIFY_T_LOW=0.35
VERIFY_T_HIGH=0.61
VERIFY_MARGIN=0.09
VERIFY_T_SINGLE=0.61
```

## Result with these thresholds and no LLM judge

- own photos accepted: 42/47
- false accepts: 0/545
- photo of another monument named correctly (wrong_place): 294/329

> lowest positive score 0.360 is below t_single: some own photos can't pass without a judge, add refs from those angles

## Scores per place (own photos, task = that place)

| place | n | min | mean | hardest other place (max) |
|---|---|---|---|---|
| elzbieta | 5 | 0.360 | 0.655 | katedra 0.658 |
| hala | 6 | 0.490 | 0.763 | most 0.533 |
| katedra | 7 | 0.738 | 0.851 | most 0.616 |
| most | 7 | 0.646 | 0.825 | katedra 0.527 |
| opera | 6 | 0.732 | 0.840 | uniwersytet 0.329 |
| piasek | 5 | 0.494 | 0.747 | elzbieta 0.737 |
| ratusz | 7 | 0.877 | 0.915 | katedra 0.509 |
| uniwersytet | 4 | 0.509 | 0.766 | piasek 0.519 |

## Missed own photos

- elzbieta/ov_1573d64d.jpg (0.557)
- elzbieta/ov_bf7842d2.jpg (0.360)
- hala/ov_be819730.jpg (0.490)
- piasek/ov_0ea81eda.jpg (0.494)
- uniwersytet/ov_15315fd0.jpg (0.509)

## Hardest negatives (photo, task, score)

- piasek/ov_c0ca102b.jpg as elzbieta: 0.737
- piasek/ov_c0ca102b.jpg as most: 0.717
- piasek/ov_0bdf4999.jpg as most: 0.710
- elzbieta/ov_8da56e31.jpg as katedra: 0.658
- elzbieta/ov_bb3fc5e9.jpg as piasek: 0.657
- elzbieta/ov_8da56e31.jpg as piasek: 0.634
- piasek/ov_2fbdce82.jpg as most: 0.617
- katedra/ov_2245278f.jpg as most: 0.616
- katedra/ov_2245278f.jpg as elzbieta: 0.615
- elzbieta/ov_1573d64d.jpg as piasek: 0.609
