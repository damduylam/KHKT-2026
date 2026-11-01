const fs=require("fs");const path=require("path");const p=path.join(__dirname,"index.html");let c=fs.readFileSync(p,"utf8");

// 1. .nav-links gap 24px -> 16px
c=c.replace(".nav-links{display:flex;gap:24px;",".nav-links{display:flex;gap:16px;");

// 2. .nav-links a remove padding
c=c.replace(".nav-links a{text-decoration:none;font-size:.85rem;color:var(--muted);padding:8px 14px;display:inline-block;" ,".nav-links a{text-decoration:none;font-size:.85rem;color:var(--muted)}");

// 3. .hero padding-bottom 70px -> 42px
c=c.replace(".hero{min-height:640px;display:grid;align-content:center;padding:58px 0 70px}",".hero{min-height:640px;display:grid;align-content:center;padding:58px 0 42px}");

// 4. .eyebrow,.tag margin-bottom 24px -> 16px
c=c.replace("margin-bottom:24px}","margin-bottom:16px}");

// 5. .hero h1 margin-bottom 28px -> 18px
c=c.replace("margin:22px 0 28px","margin:22px 0 18px");

// 6. .scan restore clip-path
c=c.replace(".scan{margin-top:28px;background:linear-gradient(120deg,#2b172daa,#17121b);border:1px solid var(--line);padding:24px;border-radius:16px}",".scan{margin-top:28px;background:linear-gradient(120deg,#2b172daa,#17121b);border:1px solid var(--line);padding:18px;clip-path:polygon(0 0,97% 0,100% 12%,100% 100%,3% 100%,0 88%)}");

// 7. .scan-row gap 16px -> 10px
c=c.replace(".scan-row{display:flex;gap:16px;margin-top:16px}",".scan-row{display:flex;gap:10px;margin-top:10px}");

// 8. .btn remove margin-bottom
c=c.replace(".btn{min-height:48px;border:0;padding:11px 18px;border-radius:99px;font-weight:800;transition:.2s;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin-bottom:12px}",".btn{min-height:48px;border:0;padding:11px 18px;border-radius:99px;font-weight:800;transition:.2s;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}");

// 9. .routes gap 24px -> 14px
c=c.replace(".routes{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}",".routes{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}");

// 10. .route restore clip-path + padding 40px -> 25px + margin-bottom 40px -> 30px
c=c.replace(".route{min-height:240px;padding:40px;text-decoration:none;color:var(--text);display:flex;flex-direction:column;justify-content:space-between;margin-bottom:40px;border:1px solid var(--line);background:#170f19;border-radius:16px}",".route{min-height:200px;padding:25px;text-decoration:none;color:var(--text);display:flex;flex-direction:column;justify-content:space-between;margin-bottom:30px;border:1px solid var(--line);background:#170f19;clip-path:polygon(0 0,100% 0,100% 88%,92% 100%,0 100%)}");

// 11. .tab-list gap 16px -> 8px
c=c.replace(".tab-list{display:flex;gap:16px;margin:26px 0}",".tab-list{display:flex;gap:8px;margin:22px 0}");

// 12. .filter gap 16px -> 8px
c=c.replace(".filter{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}",".filter{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}");

// 13. .choice margin 14px -> 8px
c=c.replace(".choice{width:100%;margin:14px 0;background:#0b080d;color:var(--text);border:1px solid var(--line);padding:16px;text-align:left;border-radius:12px}",".choice{width:100%;margin:8px 0;background:#0b080d;color:var(--text);border:1px solid var(--line);padding:14px;text-align:left;border-radius:8px}");

// 14. .card padding 28px -> 20px
c=c.replace(".news-card,.card,.scenario{padding:28px;background:var(--panel);border:1px solid #ffffff18}",".news-card,.card,.scenario{padding:20px;background:var(--panel);border:1px solid #ffffff18}");

// 15. .callout padding 28px -> 20px
c=c.replace(".callout{padding:28px;border-left:4px solid var(--gold);background:#ffd37a12}",".callout{padding:20px;border-left:4px solid var(--gold);background:#ffd37a12}");

// 16. Mobile section padding-bottom 100px -> 75px
c=c.replace("section{padding:75px 0 100px}","section{padding:75px 0}");

fs.writeFileSync(p,c,"utf8");console.log("UNDO_ALL_DONE");

