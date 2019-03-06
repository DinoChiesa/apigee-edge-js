<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:fo="http://www.w3.org/1999/XSL/Format">

  <xsl:output
      method="xml"
      omit-xml-declaration="yes"
      indent="yes"
      media-type="string"/>

 <xsl:template match="*">
    <xsl:element name="{lower-case(local-name())}">
        <xsl:apply-templates/>
    </xsl:element>
  </xsl:template>

</xsl:stylesheet>
