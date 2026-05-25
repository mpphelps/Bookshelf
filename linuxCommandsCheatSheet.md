# Linux Command Cheat Sheet

## The pipe `|` — chain commands
Sends the output of one command into the next. This is the most important concept on the list — everything else composes through it.
```bash
cat app.log | grep ERROR | tail -5
# read file → keep only ERROR lines → show last 5

ps aux | grep node
# list all running processes → filter to ones mentioning "node"

du -sh * | sort -h
# disk usage of each item in current dir, human-readable → sort smallest→largest
```

---

## Redirection: `>`, `>>`, `2>`, `<`
Pipes send output to another **command**. Redirection sends output to (or reads input from) a **file**.

```bash
echo "hello" > greeting.txt        # > overwrite file (creates if missing)
echo "world" >> greeting.txt       # >> append to file

npm run build > build.log          # save stdout to file
npm run build 2> errors.log        # 2> save stderr (error stream) to file
npm run build > out.log 2>&1       # merge stderr INTO stdout, save both
npm run build > /dev/null 2>&1     # discard everything (/dev/null = black hole)

sort < unsorted.txt                # < feed file in as stdin (rare; most cmds take a filename)
```

Quick mental model: every process has three streams — **stdin (0)**, **stdout (1)**, **stderr (2)**. `>` is shorthand for `1>`. `2>&1` means "send stream 2 to wherever stream 1 is going."

**`>` vs `| tee`:** both write to a file. Use `>` when you just want it in the file. Use `tee` when you also want to see the output live in the terminal.

---

## Navigating the filesystem

### `pwd` — print working directory
```bash
pwd                         # → /home/pi/bookshelf
```

### `ls` — list files
```bash
ls                          # files in current dir
ls -l                       # -l = long form: permissions, owner, size, date
ls -la                      # -l long + -a all (include hidden files starting with .)
ls -lh                      # -l long + -h human-readable sizes (KB, MB, GB)
```
Flags stack: `-lh` is the same as `-l -h`. Order doesn't matter.

### `cd` — change directory
```bash
cd /var/log                 # absolute path
cd ../packages/database     # relative path (.. = parent)
cd ~                        # home directory
cd -                        # previous directory
```

### `mv` — move or rename
```bash
mv old.txt new.txt          # rename
mv file.txt ../             # move to parent dir
mv src/ dest/               # move directory (no -r needed)
```

### `find` — find files by name/criteria
`find`'s "flags" are actually long-form tests, not single letters.
```bash
find . -name "*.log"                    # -name match by filename pattern
find . -name "node_modules" -type d     # -type d = directory (f = file, l = symlink)
find . -mtime -7                        # -mtime = modified time, -7 = within last 7 days
find . -size +100M                      # -size +100M = larger than 100 megabytes
```

---

## Viewing & searching files

### `cat` — print a file
```bash
cat .env                    # dump whole file to terminal
cat file1 file2             # concatenate two files
```

### `tail` — show end of a file
```bash
tail file.log               # last 10 lines (default)
tail -n 50 file.log         # -n = number of lines
tail -f /var/log/syslog     # -f = follow live (Ctrl+C to quit)
```

### `grep` — search for text
```bash
grep "ERROR" app.log        # lines containing ERROR
grep -i "error" app.log     # case-insensitive
grep -r "DATABASE_URL" .    # recursive search in current dir
grep -v "DEBUG" app.log     # invert: lines WITHOUT DEBUG
```

### `sed` — find/replace in a stream
Stream EDitor. Mostly used for substitutions.
```bash
sed 's/foo/bar/' file.txt           # s = substitute. Replace first foo per line.
sed 's/foo/bar/g' file.txt          # /g flag on the command = global (every match)
sed -i 's/foo/bar/g' file.txt       # -i = in-place (edit file directly)
sed -n '5,10p' file.txt             # -n = no auto-print; p command prints lines 5–10
```

---

## Writing & redirecting output

### `echo` — print text
```bash
echo "hello"                # → hello
echo "DB=$DATABASE_URL"     # expands env vars
echo "line" > file.txt      # overwrite file
echo "line" >> file.txt     # append to file
```

### `tee` — write to file AND stdout
Useful when you want to see output AND save it, or to write a file using sudo.
```bash
echo "hello" | tee out.txt              # writes file + prints
echo "tcp_ecn=0" | sudo tee -a /etc/sysctl.conf
# -a = append. tee runs under sudo so it can write to root-owned files.
```

---

## Files & directories

### `mkdir` — make directory
```bash
mkdir backups
mkdir -p a/b/c              # -p = create parents as needed, no error if exists
```

### `cp` — copy
```bash
cp file.txt copy.txt
cp -r src/ dest/            # -r = recursive (whole directory)
cp -a src/ dest/            # -a = archive: preserve permissions, timestamps, symlinks
```

### `rm` — remove
```bash
rm file.txt
rm -r old_dir/              # recursive (directories)
rm -f file.txt              # force (no prompt, ignore missing)
rm -rf node_modules/        # the famous one — be very careful
```
There is no undo. `rm -rf /` on the wrong machine ends careers.

### `chmod` — change permissions
Three digits, one per group: **owner / group / others**. Each digit is the sum of:
**4 = read · 2 = write · 1 = execute**

| Digit | Permissions |
|---|---|
| 7 | rwx (full) |
| 6 | rw- (read + write) |
| 5 | r-x (read + run) |
| 4 | r-- (read only) |
| 0 | --- (none) |

```bash
chmod +x deploy.sh          # add execute for everyone (symbolic form)
chmod 644 file.txt          # rw- r-- r--  typical file: owner edits, all read
chmod 755 script.sh         # rwx r-x r-x  typical script/dir: all can run, owner edits
chmod 600 .env              # rw- --- ---  secrets: owner only (ssh keys MUST be 600)
```
For **directories**, `x` means "can enter / list contents" — that's why folders need `755`, not `644`.

---

## Archives

### `tar xzf` — extract a `.tar.gz`
```bash
tar xzf backup.tar.gz       # extract gzipped tarball
tar czf backup.tar.gz dir/  # CREATE gzipped tarball from dir/
```
Mnemonic: **c**reate / e**x**tract, **z** = gzip, **f** = file (next arg is the filename), **v** = verbose.

---

## Network

### `curl` — make HTTP requests
```bash
curl https://api.github.com/users/octocat       # GET (default)
curl -I https://example.com                     # -I = head request (headers only)
curl -o page.html https://example.com           # -o = output to file (lowercase)
curl -O https://example.com/file.zip            # -O = save with remote filename (uppercase)
curl -X POST -H "Content-Type: application/json" \
     -d '{"key":"value"}' https://api.example.com
# -X = request method (POST/PUT/DELETE/...)
# -H = header (repeatable)
# -d = data (request body — implies POST if -X not given)

curl -fsSL https://get.docker.com | sh
# -f = fail (don't output broken HTML on HTTP errors)
# -s = silent (no progress bar)
# -S = show errors anyway (pairs with -s)
# -L = follow redirects (Location header)
```

### `openssl rand` — generate random bytes
Great for session secrets / API keys.
```bash
openssl rand -hex 32        # -hex = output as hex (32 bytes → 64 hex chars)
openssl rand -base64 32     # -base64 = output as base64 encoding
```
The number is the byte count, not the output length.

---

## Services & logs (systemd)

### `systemctl` — manage services
```bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl status nginx        # is it running? recent logs
sudo systemctl enable nginx        # start on boot
sudo systemctl disable nginx
```

### `journalctl` — view systemd logs
```bash
journalctl -u nginx                # -u = unit (the service name)
journalctl -u nginx -f             # -f = follow (live tail)
journalctl -u nginx --since "1 hour ago"   # --since = time filter
journalctl -u nginx -n 100         # -n = number of lines (newest)
journalctl -p err                  # -p = priority (err and above: err/crit/alert/emerg)
```

---

## Processes

### `ps` — list processes
```bash
ps aux                      # every process on the system
ps aux | grep node          # find node processes
```
`aux` is the classic combo — note no leading dash (BSD-style):
- `a` = all users (not just yours)
- `u` = user-oriented columns (USER, %CPU, %MEM, ...)
- `x` = include processes without a controlling terminal (daemons)

### `kill` — stop a process
```bash
kill 12345                  # polite stop (SIGTERM) — process can clean up
kill -9 12345               # force kill (SIGKILL) — no cleanup
pkill node                  # kill by name instead of PID
```

### `top` / `htop` — live process monitor
```bash
top                         # built-in, q to quit
htop                        # nicer UI if installed (sudo apt install htop)
```

---

## Disk space

### `df` — disk free (whole filesystem)
```bash
df -h                       # -h = human-readable (G/M/K instead of raw bytes)
```

### `du` — disk usage (per file/dir)
```bash
du -sh *                    # -s = summary (don't recurse into subdirs), -h = human-readable
du -sh ~/.cache             # size of one specific dir
du -sh * | sort -h          # sort -h = human-numeric sort (understands "1G > 500M")
```

---

## Remote: ssh & scp

### `ssh` — log into a remote machine
```bash
ssh pi@bookshelf.local                  # log in
ssh pi@bookshelf.local "df -h"          # run one command, exit
ssh -i ~/.ssh/id_ed25519 pi@host        # -i = identity file (specific private key)
```

### `scp` — copy files over ssh
```bash
scp backup.tar.gz pi@bookshelf.local:/home/pi/   # local → remote
scp pi@bookshelf.local:/var/log/app.log .        # remote → local
scp -r dist/ pi@bookshelf.local:/srv/app/        # -r = recursive (for directories)
```

---

## Pipe partners: head, sort, uniq, wc

These barely stand alone — they shine in pipelines.

```bash
head -5 file.txt            # first 5 lines (opposite of tail; -n 5 also works)
sort file.txt               # alphabetical sort (default)
sort -n nums.txt            # -n = numeric (so "10" comes after "2", not before)
sort -r file.txt            # -r = reverse
sort -h sizes.txt           # -h = human-numeric ("1G" > "500M")
uniq                        # collapse adjacent duplicate lines (usually after sort)
uniq -c                     # -c = count: prefix each line with how many duplicates
wc -l file.txt              # -l = lines
wc -w file.txt              # -w = words

# Classic combo: top 5 most common ERROR codes in a log
grep ERROR app.log | sort | uniq -c | sort -rn | head -5
# find errors → sort → count dupes → sort -rn (reverse + numeric) by count → top 5
```

---

## Permissions companions

### `sudo` — run a command as root
```bash
sudo apt update             # most system changes need root
sudo systemctl restart nginx
sudo -i                     # become root for a whole shell session (careful)
```

### `chown` — change ownership
```bash
sudo chown pi:pi file.txt           # set owner to user pi, group pi (format: user:group)
sudo chown -R pi:pi /srv/app        # -R = recursive (whole tree). Capital R, unlike rm/cp/scp.
```
Pairs with `chmod`: `chmod` controls *what* each role can do, `chown` controls *who* the roles are.

---

## Help: `man`
When you forget a flag, read the manual:
```bash
man tar                     # full manual for tar (q to quit)
man -k compress             # -k = keyword search across all manual summaries
tar --help                  # --help: quick flag list (most commands support this)
```

---

## Reading flags: the general rules

- **Short flags** are single letters with one dash: `-l`, `-h`, `-r`. They stack: `-lh` = `-l -h`.
- **Long flags** are words with two dashes: `--help`, `--since`, `--version`.
- **Most short flags are mnemonics** — `-r` recursive, `-f` force/follow/file, `-n` number/no-print, `-h` human-readable/help, `-v` verbose/invert, `-i` ignore-case/in-place/identity. Same letter can mean different things in different commands — context matters.
- **Capital vs lowercase often differ:** `curl -o` (output filename) vs `curl -O` (use remote filename); `chown -R` vs `rm -r`. When in doubt, `man <cmd>` or `<cmd> --help`.
- **`--` ends flag parsing.** `rm -- -weirdfile.txt` lets you delete a file whose name starts with `-`.

---

## A real-world combo

This pattern shows up constantly — Pi setup, CI debugging, etc.:
```bash
journalctl -u bookshelf -n 200 | grep -i error | tee /tmp/errors.txt
# pull last 200 lines of bookshelf service logs
# → filter to errors
# → save to a file AND show on screen
```
