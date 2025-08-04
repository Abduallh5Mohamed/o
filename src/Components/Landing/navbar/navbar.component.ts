import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  showSearch = false;

  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (this.showSearch) {
      // Focus the input after a short delay to ensure it's rendered
      setTimeout(() => {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }

  onSearchBlur() {
    // Hide search bar when it loses focus and is empty
    setTimeout(() => {
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput && !searchInput.value.trim()) {
        this.showSearch = false;
      }
    }, 150);
  }
}
