# Privacy, Sharing & Data Ownership

Your thoughts are personal. Mesh Notes is engineered from the ground up to keep your notes under your own control without third-party surveillance.

---

## Private by Default

Every note you write is private to your user account. No telemetry, no third-party tracking scripts, and no analytics cookies are included in the application.

All data is stored inside a single SQLite database file (`data/mesh-notes.db`) on your host machine.

---

## Secure Public Link Sharing

When you want to share a note with a colleague or friend, click the share icon on any note to generate a public link:

### 1. Standard Public Link
Anyone with the link can view your note formatted cleanly in read-only mode.

### 2. Burn After Reading (1-Time View)
Need to send an API key, WiFi password, or confidential note?
- Enable **"Self-destruct after 1 view"**.
- As soon as the recipient opens the link, the public link is permanently deleted.
- The original note remains safe in your private stream.

### 3. Password Protection
- Set a custom password when generating the share link.
- Visitors must enter the correct password before the note content is revealed.

---

## 1-Click Backup & Export

You are never locked in:
1. Open **Settings** (gear icon) in the bottom left of the sidebar.
2. Under **Backup & Export**, click **Download ZIP Archive**.
3. Mesh Notes exports your entire library:
   - **Notes**: As individual clean `.md` files with YAML frontmatter containing tags, creation timestamps, and folder structure.
   - **Bookmarks**: Exported as standard Netscape HTML format, which can be imported directly into Firefox, Chrome, Safari, or Brave.
   - **Attachments**: All uploaded photos and diagrams included in the archive.
