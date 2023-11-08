import { BeforeInsert, Column, Entity, Index } from "typeorm"
import { BaseEntity } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/medusa/dist/utils"

@Entity()
export class Translation extends BaseEntity {
  @Column({ type: "text", nullable: false })
  @Index("IDX_translation_lang")
  lang: string

  @Column({ type: "jsonb", nullable: false, default: {} })
  @Index("IDX_translation_attributes", { synchronize: false })
  attributes: Record<string, string>

  @BeforeInsert()
  private beforeInsert(): void {
    this.lang = this.lang.toLowerCase()
    this.id = generateEntityId(this.id, "trans")
  }
}
