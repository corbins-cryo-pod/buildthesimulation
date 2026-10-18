"""One bounded, independently memory-measured solver subprocess."""
import argparse
import hashlib
import json
from pathlib import Path
from solver.fem import solve, save

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--level', type=int, required=True)
    parser.add_argument('--domain', type=float, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    solution = solve(level=args.level, domain=args.domain)
    save(solution, args.output)
    print(json.dumps(solution['diagnostics'], indent=2))

if __name__ == '__main__':
    main()
