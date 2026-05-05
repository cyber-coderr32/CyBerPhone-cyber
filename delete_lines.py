
with open('components/StoreManagerPage.tsx', 'r') as f:
    lines = f.readlines()

# We want to remove the block between line 1042 and 1150 (1-indexed)
# 0-indexed: 1041 to 1149
new_lines = lines[:1041] + lines[1150:]

with open('components/StoreManagerPage.tsx', 'w') as f:
    f.writelines(new_lines)
