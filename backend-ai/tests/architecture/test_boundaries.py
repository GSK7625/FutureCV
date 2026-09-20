"""Lightweight architecture tests verifying hexagonal dependency rules via AST analysis."""

import ast
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent.parent / "app"

FORBIDDEN_DATABASE_MODULES = {
    "sqlalchemy",
    "psycopg",
    "psycopg2",
    "asyncpg",
    "tortoise",
    "peewee",
    "sqlmodel",
    "pymongo",
}


def _get_imports(file_path: Path) -> list[str]:
    """Parse a python file into an AST and return all top-level imported module names."""
    tree = ast.parse(file_path.read_text(encoding="utf-8"))
    imports: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module)
    return imports


def test_no_database_libraries_in_entire_backend_ai():
    """Rule: backend-ai must NOT import any relational or ORM database libraries."""
    py_files = list(APP_DIR.rglob("*.py"))
    assert len(py_files) > 0

    violations = []
    for py_file in py_files:
        for imported in _get_imports(py_file):
            for forbidden in FORBIDDEN_DATABASE_MODULES:
                if imported == forbidden or imported.startswith(f"{forbidden}."):
                    violations.append(f"{py_file.name} imports forbidden db library '{imported}'")

    assert not violations, "Database library violations detected:\n" + "\n".join(violations)


def test_domain_layer_dependencies():
    """Rule: Domain must not import FastAPI, Starlette, Infrastructure, Ports, or external providers."""
    domain_dir = APP_DIR / "domain"
    domain_files = list(domain_dir.rglob("*.py"))
    assert len(domain_files) > 0

    forbidden_in_domain = {
        "fastapi",
        "starlette",
        "httpx",
        "fitz",
        "openai",
        "anthropic",
        "google",
        "app.infrastructure",
        "app.ports",
        "app.api",
    }

    violations = []
    for py_file in domain_files:
        for imported in _get_imports(py_file):
            for forbidden in forbidden_in_domain:
                if imported == forbidden or imported.startswith(f"{forbidden}."):
                    violations.append(f"Domain file {py_file.name} imports '{imported}'")

    assert not violations, "Domain dependency violations detected:\n" + "\n".join(violations)


def test_application_layer_dependencies():
    """Rule: Application must orchestrate Domain and Ports, but must NOT import FastAPI or concrete providers."""
    app_layer_dir = APP_DIR / "application"
    app_files = list(app_layer_dir.rglob("*.py"))
    assert len(app_files) > 0

    forbidden_in_application = {
        "fastapi",
        "starlette",
        "app.api",
        "app.infrastructure.llm.providers",
    }

    violations = []
    for py_file in app_files:
        for imported in _get_imports(py_file):
            for forbidden in forbidden_in_application:
                if imported == forbidden or imported.startswith(f"{forbidden}."):
                    violations.append(f"Application file {py_file.name} imports '{imported}'")

    assert not violations, "Application dependency violations detected:\n" + "\n".join(violations)


def test_infrastructure_layer_dependencies():
    """Rule: Infrastructure implements Ports, but must NEVER import from Application layer."""
    infra_dir = APP_DIR / "infrastructure"
    infra_files = list(infra_dir.rglob("*.py"))
    assert len(infra_files) > 0

    forbidden_in_infra = {
        "app.application",
    }

    violations = []
    for py_file in infra_files:
        for imported in _get_imports(py_file):
            for forbidden in forbidden_in_infra:
                if imported == forbidden or imported.startswith(f"{forbidden}."):
                    violations.append(f"Infrastructure file {py_file.name} imports forbidden '{imported}'")

    assert not violations, "Infrastructure dependency violations detected:\n" + "\n".join(violations)


def test_api_routes_do_not_import_concrete_providers_directly():
    """Rule: API route modules must depend on Application services, not concrete LLM providers."""
    api_v1_dir = APP_DIR / "api" / "v1"
    api_files = [f for f in api_v1_dir.glob("*.py") if f.name != "__init__.py"]
    assert len(api_files) > 0

    forbidden_in_api = {
        "openai",
        "anthropic",
        "google",
        "app.infrastructure.llm.providers.openai_provider",
    }

    violations = []
    for py_file in api_files:
        for imported in _get_imports(py_file):
            for forbidden in forbidden_in_api:
                if imported == forbidden or imported.startswith(f"{forbidden}."):
                    violations.append(f"API route {py_file.name} directly imports provider '{imported}'")

    assert not violations, "API route provider violations detected:\n" + "\n".join(violations)
