# Repository Guidelines

## Project Structure & Module Organization

This repository is a coursework and CAD archive, not a software application.

- `Dibujo/` contains standalone SolidWorks bottle parts (`.SLDPRT`).
- `Dibujo/Proyecto/` contains the double-mill-engine exchange models (`.STEP`, `.IGS`); `Dibujo/Proyecto/step/` holds component-level STEP exports.
- `Mecanica_Ejercicios/Cruz Mecanismo/` contains the Geneva-mechanism parts and assembly (`.SLDPRT`, `.SLDASM`).
- `Mecanica_Ejercicios/Quiz 5 - Flexion Pura/` contains the Markdown study guide, numbered lesson videos, and packaged archive.

Treat files beginning with `~$` as SolidWorks temporary/lock artifacts, not authoritative models.

## Build, Test, and Development Commands

There is no build manifest, dependency manager, or automated test runner. Work is validated with the relevant CAD or media application. Use PowerShell to inventory deliverables:

```powershell
Get-ChildItem -Recurse -File | Group-Object Extension
Get-ChildItem -Recurse -File | Where-Object Length -eq 0
```

The first command summarizes file types; the second catches empty exports before submission.

## File Style & Naming Conventions

Preserve existing CAD filenames when editing assemblies because component references depend on them. Name new study resources with a two-digit sequence and descriptive words, following `00-Guia-de-estudio.md` and `01-Teoria-Flexion-Pura.mp4`. Match exported STEP filenames to their source part or assembly. Write Markdown in UTF-8 with ATX headings and short, ordered instructions.

## Testing Guidelines

No automated coverage target exists. For every CAD change, open the affected part and parent assembly in SolidWorks, rebuild, and confirm that referenced components and mates resolve. Re-import changed `.STEP` or `.IGS` files to verify exchange integrity. For study materials, confirm videos and archives open and that the guide's sequence matches the filenames.

## Commit & Pull Request Guidelines

No Git metadata or history is present, so no local commit convention can be inferred. If version control is initialized, use Conventional Commits such as `docs: update flexion study guide` or `feat: add Geneva mechanism model`. Keep binary CAD, media, and documentation changes in separate commits when practical. Pull requests should identify changed models, the SolidWorks version used, manual validation performed, and screenshots for visible geometry changes. Never include `~$` files or unrelated large binaries.