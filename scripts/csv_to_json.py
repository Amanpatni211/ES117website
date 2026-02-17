#!/usr/bin/env python3
"""Convert Google Forms CSV to structured JSON for the ES117 website."""

import csv
import json
import argparse
import re
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

def slugify(text):
    """Create a URL-friendly slug from text."""
    text = text.strip().lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text[:60]

def parse_ideation_csv(csv_path):
    """Parse the ideation phase Google Form CSV and create teams.json."""
    teams = []
    seen_projects = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        team_num = 0
        for row in reader:
            if len(row) < 7:
                continue
            
            timestamp = row[0].strip()
            email = row[1].strip()
            captain = row[2].strip()
            project_type = row[3].strip().lower()
            idea_locked = row[4].strip()
            project_name = row[5].strip()
            description = row[6].strip()
            idea_status = row[7].strip() if len(row) > 7 else ""
            funding_needed = row[8].strip() if len(row) > 8 else ""
            comments = row[9].strip() if len(row) > 9 else ""
            
            # Skip duplicate entries (keep the latest one)
            slug = slugify(project_name)
            if slug in seen_projects:
                # Update existing with latest data
                idx = seen_projects[slug]
                teams[idx]["description"] = description
                teams[idx]["captain"] = captain
                teams[idx]["comments"] = comments
                continue
            
            team_num += 1
            team_id = f"team{team_num:02d}"
            
            team = {
                "id": team_id,
                "name": project_name,
                "captain": captain,
                "email": email,
                "type": project_type,
                "description": description,
                "currentPhase": 1,
                "phaseStatus": "Ideation submitted",
                "memberCount": 25 if project_type == "hardware" else 10,
                "ideaLocked": idea_locked.lower() == "yes",
                "fundingNeeded": funding_needed.lower() == "yes" if funding_needed else False,
                "comments": comments,
                "submittedAt": timestamp,
            }
            
            seen_projects[slug] = len(teams)
            teams.append(team)
    
    return teams

def main():
    parser = argparse.ArgumentParser(description="Convert Google Form CSV to JSON for ES117 website")
    parser.add_argument("--csv", required=True, help="Path to the CSV file")
    parser.add_argument("--type", default="ideation", choices=["ideation", "weekly"],
                       help="Type of form data")
    parser.add_argument("--week", type=int, help="Week number (for weekly updates)")
    args = parser.parse_args()
    
    data_dir = PROJECT_ROOT / "data"
    data_dir.mkdir(exist_ok=True)
    
    if args.type == "ideation":
        teams = parse_ideation_csv(args.csv)
        output_path = data_dir / "teams.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(teams, f, indent=2, ensure_ascii=False)
        print(f"✅ Created {output_path} with {len(teams)} teams")
    
    elif args.type == "weekly":
        if not args.week:
            print("❌ --week is required for weekly updates")
            return
        updates_dir = data_dir / "updates"
        updates_dir.mkdir(exist_ok=True)
        # TODO: parse weekly update CSV
        print(f"Weekly update parsing for week {args.week} - coming soon")

if __name__ == "__main__":
    main()
