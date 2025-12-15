# Analytics Audit Quick Reference

## 🚀 Quick Start (5 minutes)

```bash
# 1. Check overall data quality
curl http://localhost:3005/api/audit-analytics | jq '.summary'

# 2. See what's wrong
curl http://localhost:3005/api/audit-analytics | jq '.recommendations'

# 3. Inspect raw data formats
curl http://localhost:3005/api/inspect-raw-data | jq '.ratingFormats'

# 4. Run backfill
curl -X POST http://localhost:3005/api/backfill-ratings | jq '.successCount'

# 5. Check improvement
curl http://localhost:3005/api/audit-analytics | jq '.summary.dataCompletenessScore'
```

## 📊 Endpoints Summary

| Endpoint | Method | Purpose | Time |
|----------|--------|---------|------|
| `/api/audit-analytics` | GET | Full data audit | 2s |
| `/api/inspect-raw-data` | GET | Check property formats | 1s |
| `/api/test-rating-extraction` | GET | Test extraction logic | 3s |
| `/api/validate-queries` | POST | Validate queries work | 2s |
| `/api/backfill-ratings` | POST | Fix missing ratings | 5-10s |

## 🎯 Key Metrics

### Before Audit
```
Sessions: 100
With Ratings: 20 (20%)
Average: 3.5/5
Completeness: 40%
```

### After Audit
```
Sessions: 100
With Ratings: 65 (65%)
Average: 3.7/5  ← More accurate!
Completeness: 85%
```

## ⚡ Common Issues & Fixes

### "Satisfaction is 0/5"
```bash
# Problem: No ratings in database
curl http://localhost:3005/api/audit-analytics | jq '.summary.sessionsWithRating'

# Solution: Backfill
curl -X POST http://localhost:3005/api/backfill-ratings
```

### "Only 10% have ratings"
```bash
# Check what formats exist
curl http://localhost:3005/api/inspect-raw-data | jq '.ratingFormats'

# Check extraction success
curl http://localhost:3005/api/test-rating-extraction | jq '.extractionSuccessRate'
```

### "Metrics seem wrong"
```bash
# Validate queries
curl -X POST http://localhost:3005/api/validate-queries | jq '.overallStatus'

# Compare with database directly
curl http://localhost:3005/api/audit-analytics | jq '.rawDebugInfo'
```

## 📈 What to Check Regularly

**Weekly:**
- Satisfaction score not 0 or 5
- Ratings exist for recent conversations
- Data completeness > 50%

**Monthly:**
- Run full audit sequence
- Compare trend with previous month
- Update documentation

## 🔧 Response Fields Explained

### audit-analytics
- `summary.dataCompletenessScore` → How much data is filled (0-100)
- `ratingAnalysis.average` → Actual satisfaction score
- `validationErrors` → Business logic violations found
- `recommendations` → Specific action items

### inspect-raw-data
- `ratingFormats` → All rating formats found
- `commonKeys` → Most frequent property names
- `recommendations` → Alternative properties detected

### test-rating-extraction
- `extractionSuccessRate` → % of transcripts with extractable ratings
- `ratingsFound` vs `ratingsExtracted` → Format mismatch detection

### validate-queries
- `overallStatus` → success/partial/failed
- `queries[].result` → Actual query results
- `rawDebugInfo` → Database counts for comparison

### backfill-ratings
- `sessionsChanged` → How many were fixed
- `averageRatingBefore/After` → Did accuracy improve?
- `recommendations` → Next steps

## 💡 Pro Tips

1. **Save baseline:**
   ```bash
   curl http://localhost:3005/api/audit-analytics > audit_baseline.json
   ```

2. **Compare over time:**
   ```bash
   curl http://localhost:3005/api/audit-analytics | jq '.summary' > audit_latest.json
   ```

3. **Export full audit:**
   ```bash
   curl http://localhost:3005/api/audit-analytics | jq > audit_full_$(date +%Y%m%d).json
   ```

4. **Monitor in real-time:**
   ```bash
   watch -n 60 'curl -s http://localhost:3005/api/audit-analytics | jq ".summary.dataCompletenessScore"'
   ```

## 📋 Pre-Deployment Checklist

Before going to production:
- [ ] Run full audit sequence
- [ ] Fix critical validation errors
- [ ] Data completeness > 70%
- [ ] Backfill completed
- [ ] Query validation passed
- [ ] Average satisfaction reasonable (not 0 or 5)

## 🆘 Need Help?

1. Check the full guide: `ANALYTICS_AUDIT_GUIDE.md`
2. Review logs: `app/api/audit-analytics/route.ts`
3. Examine database: `app/api/inspect-raw-data/route.ts`
4. Test extraction: `app/api/test-rating-extraction/route.ts`

---

**Remember:** All endpoints are safe, read-only diagnostics (except backfill which is safe but does write).

