import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../../share/ui/navbar/navbar';
import { Footer } from '../../../../share/ui/footer/footer';

@Component({
  selector: 'app-home',
  styleUrl: './home.scss',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './home.html',
})
export class Home {}
