# Enrichment before and after

The main lab shows the change in the data representation, then the effect on downstream code.

1. **Before:** original product titles. The example title filter searches a literal term.
2. **Enrichment:** a classification stage supplies a normalized record. Bakiano uses Gemini batch classification for this stage.
3. **After:** searches filter the saved attributes; conservative comparison guards consume them. Neither operation in this demo calls a model.

The bundled records are hand-authored illustrations. They are not model outputs, production measurements or a warehouse export. The interface labels that provenance and retains it in the record evidence.

## What the fields mean

| Field | Question it answers |
| --- | --- |
| product_type / subtype | What is this product? |
| base_ingredient | What is a derived product made from? |
| variant | Which flavor or formulation distinguishes it? |
| state | Is it fresh, canned, powdered or another presentation? |
| brand / brand_confidence | Which brand was identified, and how strongly? |
| unit / weight_grams / pack_count | Which dimension, total pack quantity and number of units? |
| type_confidence / size_confidence | How strong is the classification or quantity evidence? |

The inherited weight_grams field stores grams for mass or ml for volume; unit disambiguates it. Unit-sold items can have no mass quantity. Quantity is total across the pack, so pack count remains an independent comparison field.

## Identity versus ingredient and flavor

Protein powder made from egg is not an egg. A chicken-flavored soup or pet product is not whole chicken. The enriched subtype captures identity; ingredient and flavor stay in their own fields. That allows a small explicit predicate to exclude related products.

Liquid whole milk and powdered milk also require different subtypes and dimensions. Fresh and canned tomatoes can keep the same tomato subtype while their states remain different.

## Recovering matches

Entera and completa both map to whole_milk in the examples. Arequipe and dulce de leche both map to arequipe. Normalized attributes let a system find both listings without adding every synonym to every downstream query.

## Retrieval is not exact identity

Family retrieval checks the requested fields. Exact presentation comparison additionally checks brand, quantity, units, pack, state and reported confidence. A known contradiction returns Different. Missing, invalid or weak evidence returns Review when no known contradiction already establishes a difference.

These guards are a newly authored demonstration, not Bakiano's production matching algorithm or proof of universal identity. All required confidence flags must be high to accept a reported presentation. Missing optional fields are not silently treated as known nulls. Model confidence flags are not independently measured accuracy.

## Implementation

- data/enrichment-examples.js supplies the illustrative raw/attribute records and provenance.
- src/enriched.js consumes supplied attributes. It does not infer product meaning from titles.
- demo/enrichment.js renders the same records and filters used for the displayed result sets.
- /rules retains the separate small dictionary, CSV experiments and explicit Jev requests.

The demo makes no model calls, queries no warehouse and reports no fabricated enrichment time or cost.

![The enrichment view on mobile](images/enrichment-mobile.jpg)
