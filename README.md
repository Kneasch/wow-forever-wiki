# WoW Forever Wiki

Static HTML wiki served by nginx. Shared chrome (head, header, sidebar, footer) lives in
`site/_includes/` and is stitched into each page server-side with nginx SSI.

```
nginx/default.conf      nginx server block (SSI, clean /w/ URLs)
site/assets/wiki.css    the skin
site/_includes/         shared fragments (not directly reachable)
site/w/                 article pages, served at /w/<Page_name>
```

## Run

```bash
docker compose up
```

Then open http://localhost:8080/w/Hammer_of_Divine_Might

## Drop rates

Rates are shown as a rounded `~1/N` rather than raw counts or percentages:
`N = round(kills / drops)`, so 66 drops in 205 kills is `~1/3`.
