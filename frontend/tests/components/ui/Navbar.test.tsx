import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Navbar } from '../../../src/components/ui/Navbar';
import * as useAuthModule from '../../../src/hooks/useAuth';

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Navbar Component', () => {
  const mockSignOut = vi.fn();
  const mockUser = {
    id: 'user-123',
    email: 'teste@akasha.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      session: null,
      loading: false,
    });
  });

  const renderNavbar = () => {
    return render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
  };

  it('deve renderizar o título da marca Akasha e o botão de menu hamburger', () => {
    renderNavbar();

    const titles = screen.getAllByText('Akasha');
    expect(titles.length).toBeGreaterThan(0);

    const hamburgerButton = screen.getByRole('button', { name: /Abrir menu de navegação/i });
    expect(hamburgerButton).toBeInTheDocument();
    expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('deve abrir o menu mobile ao clicar no botão hamburger', () => {
    renderNavbar();

    const hamburgerButton = screen.getByRole('button', { name: /Abrir menu de navegação/i });
    fireEvent.click(hamburgerButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fechar menu de navegação/i })).toHaveAttribute('aria-expanded', 'true');

    const mobileNav = screen.getByRole('navigation', { name: /Navegação mobile/i });
    expect(mobileNav).toBeInTheDocument();
    
    const userEmails = screen.getAllByText('teste@akasha.com');
    expect(userEmails.length).toBeGreaterThan(0);
  });

  it('deve fechar o menu mobile ao clicar na tecla Escape', () => {
    renderNavbar();

    const hamburgerButton = screen.getByRole('button', { name: /Abrir menu de navegação/i });
    fireEvent.click(hamburgerButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve chamar a função signOut e fechar o menu mobile ao clicar em Sair da Conta', () => {
    renderNavbar();

    const hamburgerButton = screen.getByRole('button', { name: /Abrir menu de navegação/i });
    fireEvent.click(hamburgerButton);

    const logoutButtons = screen.getAllByText(/Sair/i);
    const mobileLogoutButton = logoutButtons.find((btn) => btn.closest('button'));

    expect(mobileLogoutButton).toBeDefined();
    if (mobileLogoutButton) {
      fireEvent.click(mobileLogoutButton);
    }

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve renderizar links para Privacidade (LGPD) e Termos de Uso na Sidebar desktop', () => {
    renderNavbar();

    const privacyLinks = screen.getAllByRole('link', { name: /Privacidade \(LGPD\)/i });
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    expect(privacyLinks[0]).toHaveAttribute('href', '/privacidade');

    const termsLinks = screen.getAllByRole('link', { name: /Termos de Uso/i });
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
    expect(termsLinks[0]).toHaveAttribute('href', '/termos');
  });

  it('deve renderizar links para Privacidade (LGPD) e Termos de Uso no Menu mobile', () => {
    renderNavbar();

    const hamburgerButton = screen.getByRole('button', { name: /Abrir menu de navegação/i });
    fireEvent.click(hamburgerButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const privacyLinks = screen.getAllByRole('link', { name: /Privacidade \(LGPD\)/i });
    // Deve haver na sidebar e no modal mobile
    expect(privacyLinks.length).toBe(2);

    const termsLinks = screen.getAllByRole('link', { name: /Termos de Uso/i });
    expect(termsLinks.length).toBe(2);
  });
});
