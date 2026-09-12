"""Skill normalization and canonical naming resolution."""

import re

# Canonical skill aliases for robust matching
SKILL_ALIASES: dict[str, str] = {
    "react": "react",
    "reactjs": "react",
    "react.js": "react",
    "react native": "react-native",
    "reactnative": "react-native",
    "node": "node.js",
    "nodejs": "node.js",
    "node.js": "node.js",
    "ts": "typescript",
    "typescript": "typescript",
    "js": "javascript",
    "javascript": "javascript",
    "py": "python",
    "python": "python",
    "c#": "c#",
    "csharp": "c#",
    "dotnet": ".net",
    ".net": ".net",
    ".net core": ".net",
    "asp.net": "asp.net",
    "asp.net core": "asp.net",
    "golang": "go",
    "go": "go",
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "docker": "docker",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "mongo": "mongodb",
    "mongodb": "mongodb",
    "aws": "aws",
    "azure": "azure",
    "gcp": "gcp",
    "google cloud": "gcp",
}


def normalize_skill(skill: str) -> str:
    """Normalize a single skill name to its canonical lower-case representation."""
    cleaned = skill.strip().lower()
    # Remove surrounding punctuation except '#' and '.'
    cleaned = re.sub(r"^[^\w#.]+|[^\w#.]+$", "", cleaned)
    return SKILL_ALIASES.get(cleaned, cleaned)


def normalize_skills(skills: list[str]) -> set[str]:
    """Normalize a collection of skill names into a deduplicated set of canonical skill names."""
    return {normalize_skill(s) for s in skills if s.strip()}

