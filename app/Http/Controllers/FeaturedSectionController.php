<?php

namespace App\Http\Controllers;

use App\Models\FeaturedEntry;
use App\Models\User;
use App\Services\FeaturedSectionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FeaturedSectionController extends Controller
{
    public function __construct(private FeaturedSectionService $featured) {}

    public function index(Request $request): Response
    {
        $section = $this->sectionFrom($request);
        $query = $this->queryFrom($request);

        return Inertia::render('Dashboard/FeaturedSection', [
            'sections' => $this->featured->dashboard(),
            'candidates' => $query === '' ? [] : $this->featured->search($section, $query),
            'filters' => [
                'section' => $section,
                'q' => $query,
            ],
            'maxPerSection' => FeaturedEntry::MAX_PER_SECTION,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'section' => ['required', 'string', Rule::in(array_keys(FeaturedEntry::sections()))],
            'entity_id' => ['required', 'integer', 'min:1'],
        ]);

        $this->featured->add($data['section'], (int) $data['entity_id'], Auth::id());

        return $this->redirectToIndex($request)->with('success', 'Added to the Featured Section.');
    }

    public function toggle(Request $request, FeaturedEntry $featuredEntry): RedirectResponse
    {
        $entry = $this->featured->toggle($featuredEntry);
        $message = $entry->is_active
            ? 'This entry is now shown in the mobile Featured Section.'
            : 'This entry is now hidden from the mobile Featured Section.';

        return $this->redirectToIndex($request, $entry->section)->with('success', $message);
    }

    public function destroy(Request $request, FeaturedEntry $featuredEntry): RedirectResponse
    {
        $section = $featuredEntry->section;
        $this->featured->remove($featuredEntry);

        return $this->redirectToIndex($request, $section)->with('success', 'Removed from the Featured Section.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'section' => ['required', 'string', Rule::in(array_keys(FeaturedEntry::sections()))],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', 'min:1'],
        ]);

        $this->featured->reorder($data['section'], $data['ids']);

        return $this->redirectToIndex($request, $data['section'])->with('success', 'Featured order saved.');
    }

    private function redirectToIndex(Request $request, ?string $section = null): RedirectResponse
    {
        $section = $section && array_key_exists($section, FeaturedEntry::sections())
            ? $section
            : $this->sectionFrom($request);

        $params = ['section' => $section];
        $query = $this->queryFrom($request);
        if ($query !== '') {
            $params['q'] = $query;
        }

        $route = Auth::user()?->user_type === User::TYPE_ADMIN
            ? 'dashboard.admin.featured.index'
            : 'dashboard.super-admin.featured.index';

        return redirect()->route($route, $params);
    }

    private function sectionFrom(Request $request): string
    {
        $section = (string) $request->input('section', $request->query('section', FeaturedEntry::SECTION_PRODUCT));

        return array_key_exists($section, FeaturedEntry::sections())
            ? $section
            : FeaturedEntry::SECTION_PRODUCT;
    }

    private function queryFrom(Request $request): string
    {
        $query = trim((string) $request->input('q', $request->query('q', '')));

        return mb_strlen($query) >= 2 ? $query : '';
    }
}
