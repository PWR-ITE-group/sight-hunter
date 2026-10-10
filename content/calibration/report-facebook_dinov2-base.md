# Calibration 2026-10-10 22:21 · model `facebook/dinov2-base`

Places: 8, test photos: {'_none': 27, 'elzbieta': 5, 'hala': 6, 'katedra': 7, 'most': 7, 'opera': 6, 'piasek': 5, 'ratusz': 7, 'uniwersytet': 4}

## Recommended thresholds (worker .env)

```
VERIFY_T_LOW=0.35
VERIFY_T_HIGH=0.57
VERIFY_MARGIN=0.03
VERIFY_T_SINGLE=0.57
```

## Result with these thresholds and no LLM judge

- own photos accepted: 40/47
- false accepts: 0/545
- photo of another monument named correctly (wrong_place): 280/329

> lowest positive score 0.360 is below t_single: some own photos can't pass without a judge, add refs from those angles

## Scores per place (own photos, task = that place)

| place | n | min | mean | hardest other place (max) |
|---|---|---|---|---|
| elzbieta | 5 | 0.360 | 0.655 | piasek 0.657 |
| hala | 6 | 0.490 | 0.763 | most 0.533 |
| katedra | 7 | 0.490 | 0.692 | piasek 0.595 |
| most | 7 | 0.646 | 0.761 | piasek 0.520 |
| opera | 6 | 0.732 | 0.840 | uniwersytet 0.329 |
| piasek | 5 | 0.494 | 0.674 | elzbieta 0.737 |
| ratusz | 7 | 0.877 | 0.915 | katedra 0.509 |
| uniwersytet | 4 | 0.509 | 0.766 | piasek 0.519 |

## Missed own photos

- elzbieta/ov_1573d64d.jpg (0.557)
- elzbieta/ov_bf7842d2.jpg (0.360)
- hala/ov_be819730.jpg (0.490)
- katedra/ov_8788bfcd.jpg (0.490)
- piasek/ov_0ea81eda.jpg (0.494)
- piasek/ov_2ebc2e76.jpg (0.530)
- uniwersytet/ov_15315fd0.jpg (0.509)

## Hardest negatives (photo, task, score)

- piasek/ov_c0ca102b.jpg as elzbieta: 0.737
- elzbieta/ov_bb3fc5e9.jpg as piasek: 0.657
- piasek/ov_2fbdce82.jpg as elzbieta: 0.597
- katedra/ov_2245278f.jpg as piasek: 0.595
- katedra/ov_2245278f.jpg as elzbieta: 0.584
- piasek/ov_0bdf4999.jpg as elzbieta: 0.573
- elzbieta/ov_1573d64d.jpg as katedra: 0.569
- elzbieta/ov_8da56e31.jpg as katedra: 0.564
- elzbieta/ov_8da56e31.jpg as ratusz: 0.551
- piasek/ov_2ebc2e76.jpg as elzbieta: 0.548
