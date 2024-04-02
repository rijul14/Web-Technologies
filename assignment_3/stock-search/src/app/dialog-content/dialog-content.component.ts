import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { NewsArticle } from '../search/search.component'; // Update the path
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-content',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './dialog-content.component.html',
  styleUrl: './dialog-content.component.css'
})
export class DialogContentComponent {
  articleDate: Date = new Date(this.data.article.datetime * 1000);

  constructor(
    public dialogRef: MatDialogRef<DialogContentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { article: NewsArticle }
  ) {}

  closeDialog(): void {
    this.dialogRef.close();
  }

  encodeURIComponent(text: string): string {
    return encodeURIComponent(text);
  }
}
